def generate_output_grids(height, width, strides=[8,16,32]):
        """
        Generate a tensor containing grid coordinates and strides for a given height and width.

        Args:
            height (int): The height of the image.
            width (int): The width of the image.

        Returns:
            torch.Tensor: A tensor containing grid coordinates and strides.
        """

        all_coordinates = []

        # We will use a loop but it won't affect the exportability of the model to ONNX 
        # as the loop is not dependent on the input data (height, width) but on the 'strides' which is model parameter.
        for i, stride in enumerate(strides):
            # Calculate the grid height and width
            grid_height = height // stride
            grid_width = width // stride

            # Generate grid coordinates
            g1, g0 = torch.meshgrid(torch.arange(grid_height), torch.arange(grid_width), indexing='ij')
            
            # Create a tensor of strides
            s = torch.full((grid_height, grid_width), stride)

            # Stack the coordinates along with the stride
            coordinates = torch.stack((g0.flatten(), g1.flatten(), s.flatten()), dim=-1)

            # Append to the list
            all_coordinates.append(coordinates)

        # Concatenate all tensors in the list along the first dimension
        output_grids = torch.cat(all_coordinates, dim=0)

        return output_grids
